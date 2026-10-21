import UIKit
import Capacitor

// O jogo foi feito para o celular em pé: trava em retrato e usa a barra de status clara,
// que aparece sobre o fundo azul-marinho. Os plugins (Filesystem para o save) vêm pelo
// CapApp-SPM, que o `npx cap sync ios` mantém em dia.
class BridgeViewController: CAPBridgeViewController {
    // Os plugins próprios (Premium e anúncios) são registrados à mão: no projeto com SPM a descoberta automática de
    // plugins próprios nem sempre funciona (foi o que aconteceu no GOLAÇO).
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(PremiumPlugin())
        bridge?.registerPluginInstance(AnunciosPlugin())
    }

    override open var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        return .portrait
    }

    override open var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    override open func viewDidLoad() {
        super.viewDidLoad()
        // Sem o "pulo" branco ao abrir e ao rolar além do fim da tela.
        let fundo = UIColor(red: 7 / 255, green: 14 / 255, blue: 28 / 255, alpha: 1)
        view.backgroundColor = fundo
        webView?.isOpaque = false
        webView?.backgroundColor = fundo
        webView?.scrollView.backgroundColor = fundo
        webView?.scrollView.bounces = false
    }
}
