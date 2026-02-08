import { usePWA } from "@/hooks/usePWA";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, CheckCircle, Smartphone, Share, Plus } from "lucide-react";
import { Link } from "react-router-dom";

export default function Install() {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWA();

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      // Installation was accepted
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Instalar HorasTI</CardTitle>
          <CardDescription>
            Instale o app no seu dispositivo para acesso rápido
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">App já instalado!</h3>
                <p className="text-muted-foreground text-sm">
                  O HorasTI já está instalado no seu dispositivo.
                </p>
              </div>
              <Link to="/login">
                <Button className="w-full">Ir para o Login</Button>
              </Link>
            </div>
          ) : isInstallable ? (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium">Benefícios do app:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Acesso rápido pela tela inicial
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Funciona offline
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Carregamento mais rápido
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Experiência de app nativo
                  </li>
                </ul>
              </div>
              <Button onClick={handleInstall} className="w-full" size="lg">
                <Download className="mr-2 h-5 w-5" />
                Instalar App
              </Button>
            </div>
          ) : isIOS ? (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium">Como instalar no iPhone/iPad:</h4>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      1
                    </span>
                    <span>
                      Toque no botão <Share className="inline h-4 w-4" /> Compartilhar na barra do Safari
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      2
                    </span>
                    <span>
                      Role para baixo e toque em <Plus className="inline h-4 w-4" /> "Adicionar à Tela de Início"
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      3
                    </span>
                    <span>Confirme tocando em "Adicionar"</span>
                  </li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground text-sm">
                Abra este site no navegador do seu celular para instalar o app.
              </p>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground break-all">
                  {window.location.origin}
                </p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t text-center">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
              Continuar no navegador →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
