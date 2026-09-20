import { useState } from "react";
import { coop, type PartnerState } from "@/lib/game/coop";

interface CoopModalProps {
  onClose: () => void;
  partner: PartnerState | null;
  onSendPing: (text: string, kind: "danger" | "refuge" | "help" | "loot") => void;
}

export function CoopModal({
  onClose,
  partner,
  onSendPing,
}: CoopModalProps) {
  const [inputCode, setInputCode] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(coop.getRoomId());
  const [copied, setCopied] = useState(false);

  const handleCreateRoom = () => {
    const code = coop.createRoom();
    setCreatedCode(code);
  };

  const handleJoinRoom = () => {
    if (!inputCode.trim()) return;
    coop.joinRoom(inputCode.trim());
    setCreatedCode(inputCode.trim().toUpperCase());
  };

  const handleEnableBot = () => {
    coop.enableBotCompanion();
    setCreatedCode("BOT-SOLO");
  };

  const handleDisconnect = () => {
    coop.disconnect();
    setCreatedCode(null);
  };

  const copyCode = () => {
    if (createdCode) {
      navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="pointer-events-auto self-center max-w-lg w-full rounded-lg border border-sky-500/50 bg-card/95 p-6 shadow-2xl backdrop-blur animate-in fade-in zoom-in-95 duration-150">
      {/* Encabezado */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👥</span>
          <div>
            <h3 className="text-base font-bold text-sky-300">
              Modo Cooperativo en Línea (Co-op)
            </h3>
            <p className="text-xs text-muted-foreground">
              Juega y sobrevive junto a un compañero Ronin en tiempo real.
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {/* Si ya hay sala activa */}
        {createdCode ? (
          <div className="rounded-lg border border-sky-500/40 bg-sky-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold">
                  Código de Sala Co-op:
                </span>
                <p className="text-2xl font-extrabold text-sky-400 tracking-wider">
                  {createdCode}
                </p>
              </div>
              <button
                onClick={copyCode}
                className="rounded bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 transition-colors shadow"
              >
                {copied ? "¡Copiado! ✓" : "Copiar Código"}
              </button>
            </div>

            {/* Estado del compañero */}
            <div className="rounded border border-border/60 bg-secondary/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Compañero:
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    partner
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-amber-500/20 text-amber-300 animate-pulse"
                  }`}
                >
                  {partner ? "Conectado en el mundo ✓" : "Esperando que se una..."}
                </span>
              </div>

              {partner && (
                <div className="mt-2 text-xs space-y-1 text-muted-foreground">
                  <p>Nombre: <strong className="text-foreground">{partner.name}</strong></p>
                  <p>Salud: <strong className="text-sky-300">{partner.health}%</strong></p>
                  <p>Estado actual: <strong className="text-emerald-400 uppercase text-[10px]">{partner.status}</strong></p>
                </div>
              )}
            </div>

            {/* Pings rápidos de escuadrón */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                Pings Tácticos Rápidos:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onSendPing("¡Zombis acercándose! ¡Cuidado!", "danger")}
                  className="rounded bg-red-950/60 border border-red-500/40 p-2 text-xs font-medium text-red-200 hover:bg-red-900 transition-colors text-left"
                >
                  ⚠️ ¡Peligro Inminente!
                </button>
                <button
                  onClick={() => onSendPing("¡Reagrupaos en el refugio!", "refuge")}
                  className="rounded bg-sky-950/60 border border-sky-500/40 p-2 text-xs font-medium text-sky-200 hover:bg-sky-900 transition-colors text-left"
                >
                  🏯 ¡Al Refugio!
                </button>
                <button
                  onClick={() => onSendPing("¡He colocado una trampa aquí!", "loot")}
                  className="rounded bg-amber-950/60 border border-amber-500/40 p-2 text-xs font-medium text-amber-200 hover:bg-amber-900 transition-colors text-left"
                >
                  🪤 ¡Defensa Colocada!
                </button>
                <button
                  onClick={() => onSendPing("¡Necesito medicina o bento!", "help")}
                  className="rounded bg-emerald-950/60 border border-emerald-500/40 p-2 text-xs font-medium text-emerald-200 hover:bg-emerald-900 transition-colors text-left"
                >
                  🌿 ¡Necesito Apoyo!
                </button>
              </div>
            </div>

            <button
              onClick={handleDisconnect}
              className="w-full rounded border border-destructive/50 bg-destructive/20 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive hover:text-white transition-colors"
            >
              Desconectar Sesión Co-op
            </button>
          </div>
        ) : (
          /* Opciones de creación o unión */
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-secondary/20 p-4 text-center">
              <h4 className="font-semibold text-sm mb-1">Crear Nueva Sesión</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Genera un código único para invitar a tu amigo a tu mundo.
              </p>
              <button
                onClick={handleCreateRoom}
                className="rounded bg-sky-600 px-5 py-2 text-xs font-bold text-white hover:bg-sky-500 transition-colors shadow"
              >
                Crear Sala Co-op
              </button>
            </div>

            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <h4 className="font-semibold text-sm mb-1 text-center">
                Unirse a la Sala de un Amigo
              </h4>
              <p className="text-xs text-muted-foreground text-center mb-3">
                Introduce el código de sala compartido por tu compañero.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: KAMI-123"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  className="flex-1 rounded border border-border bg-background px-3 py-1.5 text-xs text-foreground uppercase tracking-widest placeholder:normal-case font-mono"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={!inputCode.trim()}
                  className="rounded bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  Unirse
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-center">
              <p className="text-xs text-emerald-300 font-medium mb-2">
                ¿Jugando solo por ahora? Invoca a un Ronin Aliado controlado por IA táctica para probar el modo cooperativo al instante.
              </p>
              <button
                onClick={handleEnableBot}
                className="rounded bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow"
              >
                Invocar Compañero Ronin (Bot IA)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
