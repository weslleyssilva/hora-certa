import { describe, expect, it } from "vitest";
import { applyAccessLevel, getAccessLevel, hasDirectoryAccess, normalizeWriteChange } from "@/lib/accessControl";

describe("regras de permissão de diretórios", () => {
  it("leitura e alteração concede as duas permissões", () => {
    expect(applyAccessLevel("read_write")).toEqual({ read: "granted", write: "granted" });
  });

  it("leitura não concede alteração", () => {
    expect(applyAccessLevel("read")).toEqual({ read: "granted", write: "denied" });
  });

  it("sem acesso nega explicitamente leitura e alteração", () => {
    expect(applyAccessLevel("denied")).toEqual({ read: "denied", write: "denied" });
  });

  it("não definido não é interpretado como acesso negado", () => {
    expect(applyAccessLevel("undefined")).toEqual({ read: "undefined", write: "undefined" });
    expect(getAccessLevel("undefined", "undefined")).toBe("undefined");
  });

  it("alteração sempre inclui leitura", () => {
    expect(normalizeWriteChange("denied", "granted")).toEqual({ read: "granted", write: "granted" });
    expect(normalizeWriteChange("limited", "granted")).toEqual({ read: "limited", write: "granted" });
  });

  it("acesso limitado exige classificação própria e permite consultar o diretório", () => {
    expect(getAccessLevel("limited", "limited")).toBe("limited");
    expect(hasDirectoryAccess("limited", "limited")).toBe(true);
  });

  it("negação explícita não autoriza consultar o diretório", () => {
    expect(hasDirectoryAccess("denied", "undefined")).toBe(false);
    expect(hasDirectoryAccess("denied", "denied")).toBe(false);
  });
});
