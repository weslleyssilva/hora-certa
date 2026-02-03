import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, KeyRound, AlertCircle, CheckCircle } from "lucide-react";
import { z } from "zod";

const passwordSchema = z.object({
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(100),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const verifyToken = async () => {
      // Check for hash fragment (Supabase sends tokens in URL hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");

      // Also check for error in hash
      const errorDescription = hashParams.get("error_description");
      if (errorDescription) {
        setError(decodeURIComponent(errorDescription));
        setIsVerifying(false);
        return;
      }

      // If we have tokens in the hash, set the session
      if (accessToken && refreshToken && type === "recovery") {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          setError("Link de recuperação inválido ou expirado. Solicite um novo.");
          setIsVerifying(false);
          return;
        }

        setIsValidToken(true);
        setIsVerifying(false);
        // Clean up the URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // Check if user already has an active recovery session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsValidToken(true);
        setIsVerifying(false);
        return;
      }

      // No valid token found
      setError("Link de recuperação inválido ou expirado. Solicite um novo.");
      setIsVerifying(false);
    };

    verifyToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = passwordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    const { error: updateError } = await updatePassword(password);

    if (updateError) {
      setError("Erro ao atualizar senha. Tente novamente.");
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      navigate("/dashboard");
    }, 2000);
  };

  // Loading state while verifying token
  if (isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm border-border/50 shadow-sm">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <Loader2 className="h-6 w-6 text-primary-foreground animate-spin" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Verificando...</CardTitle>
              <CardDescription className="mt-1">
                Validando seu link de recuperação
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Invalid token state
  if (!isValidToken && !success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm border-border/50 shadow-sm">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-destructive">
              <AlertCircle className="h-6 w-6 text-destructive-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Link Inválido</CardTitle>
              <CardDescription className="mt-2 text-destructive">
                {error || "O link de recuperação é inválido ou expirou."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/forgot-password")}
            >
              Solicitar Novo Link
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md shadow-elevated animate-fade-in">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-success shadow-soft">
              <CheckCircle className="h-7 w-7 text-success-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Senha Atualizada!</CardTitle>
              <CardDescription className="mt-2">
                Sua senha foi alterada com sucesso. Redirecionando...
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-border/50 shadow-sm">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <KeyRound className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Nova Senha</CardTitle>
            <CardDescription className="mt-1">
              Defina sua nova senha de acesso
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="animate-scale-in">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="h-11"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full h-10"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Nova Senha"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}