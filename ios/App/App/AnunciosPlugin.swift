import Foundation
import UIKit
import Capacitor
import GoogleMobileAds
import UserMessagingPlatform

// Anúncios de tela cheia (AdMob), do mesmo jeito do GOLAÇO: o SDK do Google é usado direto,
// sempre com anúncios não personalizados (npa), então não precisa do pedido de rastreamento (ATT).
// Quem tem o Premium não vê anúncio: o JS (js/anuncios.js) nem chama o plugin nesse caso.
@objc(AnunciosPlugin)
public class AnunciosPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AnunciosPlugin"
    public let jsName = "Anuncios"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initAds", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showInterstitialAd", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showRewardedAd", returnType: CAPPluginReturnPromise)
    ]

    private var interstitialAd: InterstitialAd?
    private var rewardedAd: RewardedAd?
    private var chamadaPremiado: CAPPluginCall?
    private var ganhouRecompensa = false

    // O formulário de consentimento do Google (UMP) é obrigatório pela política do AdMob antes de
    // pedir anúncios: ele decide se o jogador (Europa, Reino Unido, Suíça) precisa ver a mensagem.
    @objc func initAds(_ call: CAPPluginCall) {
        let parameters = RequestParameters()
        parameters.isTaggedForUnderAgeOfConsent = false

        ConsentInformation.shared.requestConsentInfoUpdate(with: parameters) { [weak self] requestError in
            guard let self = self else { return }
            if let requestError = requestError {
                // Sem conseguir saber o consentimento (offline...): segue com o SDK, sempre não personalizado.
                print("UMP requestConsentInfoUpdate falhou: \(requestError.localizedDescription)")
                MobileAds.shared.start { _ in call.resolve() }
                return
            }
            guard let vc = self.bridge?.viewController else {
                MobileAds.shared.start { _ in call.resolve() }
                return
            }
            ConsentForm.loadAndPresentIfRequired(from: vc) { loadError in
                if let loadError = loadError {
                    print("UMP loadAndPresentIfRequired falhou: \(loadError.localizedDescription)")
                }
                MobileAds.shared.start { _ in call.resolve() }
            }
        }
    }

    @objc func showInterstitialAd(_ call: CAPPluginCall) {
        guard let adId = call.getString("adId") else {
            call.reject("adId é obrigatório")
            return
        }
        let request = Request()
        if call.getBool("npa") == true {
            let extras = Extras()
            extras.additionalParameters = ["npa": "1"]
            request.register(extras)
        }
        InterstitialAd.load(with: adId, request: request) { [weak self] ad, error in
            guard let self = self else { return }
            if let error = error {
                call.reject("Falha ao carregar o anúncio: \(error.localizedDescription)")
                return
            }
            guard let ad = ad else {
                call.reject("Falha ao carregar o anúncio")
                return
            }
            self.interstitialAd = ad
            DispatchQueue.main.async {
                guard let vc = self.bridge?.viewController else {
                    // Nada foi mostrado: não pode contar como anúncio exibido.
                    self.interstitialAd = nil
                    call.reject("Sem tela para mostrar o anúncio")
                    return
                }
                ad.present(from: vc)
                call.resolve()
            }
        }
    }

    // Anúncio premiado (pular a espera entre temporadas). Resolve com { rewarded: true } só se o jogador assistiu até o fim;
    // se fechar antes, resolve com { rewarded: false }.
    @objc func showRewardedAd(_ call: CAPPluginCall) {
        guard let adId = call.getString("adId") else {
            call.reject("adId é obrigatório")
            return
        }
        let request = Request()
        if call.getBool("npa") == true {
            let extras = Extras()
            extras.additionalParameters = ["npa": "1"]
            request.register(extras)
        }
        RewardedAd.load(with: adId, request: request) { [weak self] ad, error in
            guard let self = self else { return }
            if let error = error {
                call.reject("Falha ao carregar o anúncio: \(error.localizedDescription)")
                return
            }
            guard let ad = ad else {
                call.reject("Falha ao carregar o anúncio")
                return
            }
            self.rewardedAd = ad
            ad.fullScreenContentDelegate = self
            DispatchQueue.main.async {
                guard let vc = self.bridge?.viewController else {
                    self.rewardedAd = nil
                    call.reject("Sem tela para mostrar o anúncio")
                    return
                }
                self.chamadaPremiado = call
                self.ganhouRecompensa = false
                ad.present(from: vc) {
                    self.ganhouRecompensa = true
                }
            }
        }
    }
}

extension AnunciosPlugin: FullScreenContentDelegate {
    public func adDidDismissFullScreenContent(_ ad: FullScreenPresentingAd) {
        guard let call = chamadaPremiado else { return }
        chamadaPremiado = nil
        rewardedAd = nil
        call.resolve(["rewarded": ganhouRecompensa])
    }

    public func ad(_ ad: FullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) {
        guard let call = chamadaPremiado else { return }
        chamadaPremiado = nil
        rewardedAd = nil
        call.reject("Falha ao mostrar o anúncio: \(error.localizedDescription)")
    }
}
