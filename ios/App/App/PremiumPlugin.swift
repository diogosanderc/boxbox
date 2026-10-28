import Foundation
import Capacitor
import StoreKit

// Superlicença Premium: compra única (não consumível) pela App Store, com StoreKit 2.
// Mesmo esquema do GOLAÇO: comprar, restaurar, conferir e avisar o JS quando uma compra chega
// fora do fluxo normal (aprovada depois por um responsável, feita em outro aparelho...).
// O JS fala com ele por js/premium.js (registerPlugin('Premium')).

private let premiumProductId = "com.diogosander.superlicenca.premium"

private struct PremiumStoreTimeout: Error {}

// Resolve a continuação uma vez só: o que vier primeiro entre "a App Store respondeu" e "deu tempo".
private final class OnceBox<T>: @unchecked Sendable { // protegida por lock: só uma resposta passa
    private let lock = NSLock()
    private var continuation: CheckedContinuation<T, Error>?
    init(_ continuation: CheckedContinuation<T, Error>) { self.continuation = continuation }
    func finish(_ result: Result<T, Error>) {
        lock.lock()
        let c = continuation
        continuation = nil
        lock.unlock()
        c?.resume(with: result)
    }
}

@objc(PremiumPlugin)
public class PremiumPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PremiumPlugin"
    public let jsName = "Premium"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "purchasePremium", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isPremiumUnlocked", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPremiumProduct", returnType: CAPPluginReturnPromise),
    ]

    private var transactionUpdatesTask: Task<Void, Never>?

    // A Apple exige escutar Transaction.updates desde a abertura: compras pendentes, aprovadas
    // depois ou interrompidas chegam por aqui, e sem isso o jogador paga e nada é liberado.
    public override func load() {
        transactionUpdatesTask = Task.detached { [weak self] in
            for await result in Transaction.updates {
                await self?.handle(transactionResult: result)
            }
        }
        Task { [weak self] in
            for await result in Transaction.unfinished {
                await self?.handle(transactionResult: result)
            }
        }
    }

    deinit {
        transactionUpdatesTask?.cancel()
    }

    private func handle(transactionResult result: VerificationResult<Transaction>) async {
        guard case .verified(let transaction) = result else { return }
        await transaction.finish()
        guard transaction.productID == premiumProductId else { return }
        notifyListeners("premiumChanged", data: ["unlocked": transaction.revocationDate == nil])
    }

    // Product.products(for:) não tem tempo-limite próprio: numa conexão ruim pode nunca voltar.
    private static func fetchPremiumProduct(timeoutSeconds: Double = 20) async throws -> Product? {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Product?, Error>) in
            let box = OnceBox(continuation)
            Task {
                do {
                    box.finish(.success(try await Product.products(for: [premiumProductId]).first))
                } catch {
                    box.finish(.failure(error))
                }
            }
            DispatchQueue.global().asyncAfter(deadline: .now() + timeoutSeconds) {
                box.finish(.failure(PremiumStoreTimeout()))
            }
        }
    }


    @objc func getPremiumProduct(_ call: CAPPluginCall) {
        Task {
            do {
                guard let product = try await PremiumPlugin.fetchPremiumProduct() else {
                    call.resolve(["available": false])
                    return
                }
                call.resolve(["available": true, "displayPrice": product.displayPrice])
            } catch {
                call.resolve(["available": false])
            }
        }
    }

    @objc func purchasePremium(_ call: CAPPluginCall) {
        Task {
            do {
                guard let product = try await PremiumPlugin.fetchPremiumProduct() else {
                    call.reject("Produto Premium não encontrado", "PRODUCT_NOT_FOUND")
                    return
                }
                // A partir do iOS 17 a Apple quer saber em qual janela mostrar a folha de pagamento.
                let result: Product.PurchaseResult
                let scene = await MainActor.run { self.bridge?.viewController?.view.window?.windowScene }
                if #available(iOS 17.0, *), let scene = scene {
                    result = try await product.purchase(confirmIn: scene)
                } else {
                    result = try await product.purchase()
                }
                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        await transaction.finish()
                        call.resolve(["purchased": true, "status": "purchased"])
                    case .unverified(_, let error):
                        call.reject("Não foi possível verificar a compra: \(error.localizedDescription)", "UNVERIFIED")
                    }
                case .userCancelled:
                    call.resolve(["purchased": false, "status": "cancelled"])
                case .pending:
                    // Ask to Buy ou pagamento aguardando: o resultado chega depois por Transaction.updates.
                    call.resolve(["purchased": false, "status": "pending"])
                @unknown default:
                    call.resolve(["purchased": false, "status": "cancelled"])
                }
            } catch {
                var code = "PURCHASE_FAILED"
                if error is PremiumStoreTimeout {
                    code = "TIMEOUT"
                } else if let storeError = error as? StoreKitError, case .networkError(_) = storeError {
                    code = "NETWORK"
                } else if let purchaseError = error as? Product.PurchaseError, case .purchaseNotAllowed = purchaseError {
                    code = "NOT_ALLOWED"
                }
                call.reject("Falha na compra: \(error.localizedDescription)", code)
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                call.resolve(["restored": await PremiumPlugin.hasPremiumEntitlement()])
            } catch {
                call.reject("Falha ao restaurar compras: \(error.localizedDescription)")
            }
        }
    }

    @objc func isPremiumUnlocked(_ call: CAPPluginCall) {
        Task {
            call.resolve(["unlocked": await PremiumPlugin.hasPremiumEntitlement()])
        }
    }

    private static func hasPremiumEntitlement() async -> Bool {
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result, transaction.productID == premiumProductId, transaction.revocationDate == nil {
                return true
            }
        }
        return false
    }
}
