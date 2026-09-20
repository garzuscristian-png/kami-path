export interface PartnerState {
  id: string;
  name: string;
  x: number;
  z: number;
  rotationY: number;
  health: number;
  isAttacking: boolean;
  attackId: number;
  status: "explorando" | "combatiendo" | "en_refugio" | "herido";
  lastSeen: number;
}

export interface CoopPing {
  id: string;
  sender: string;
  text: string;
  kind: "danger" | "refuge" | "help" | "loot";
  timestamp: number;
}

class CoopManager {
  private channel: BroadcastChannel | null = null;
  private currentRoom: string | null = null;
  private isHost: boolean = false;
  private partnerState: PartnerState | null = null;
  private isBotEnabled: boolean = false;
  private botTarget: { x: number; z: number } = { x: 2, z: 4 };

  private partnerListeners: ((state: PartnerState | null) => void)[] = [];
  private pingListeners: ((ping: CoopPing) => void)[] = [];

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.channel = new BroadcastChannel("kami_path_coop_network");
      this.channel.onmessage = (e) => this.handleMessage(e.data);
    }
  }

  public getRoomId(): string | null {
    return this.currentRoom;
  }

  public isConnected(): boolean {
    return this.currentRoom !== null && (this.partnerState !== null || this.isBotEnabled);
  }

  public createRoom(): string {
    const code = "KAMI-" + Math.floor(100 + Math.random() * 900);
    this.currentRoom = code;
    this.isHost = true;
    this.isBotEnabled = false;

    this.broadcast({
      type: "ROOM_CREATED",
      roomId: code,
    });

    return code;
  }

  public joinRoom(code: string): boolean {
    const cleanCode = code.trim().toUpperCase();
    this.currentRoom = cleanCode;
    this.isHost = false;
    this.isBotEnabled = false;

    this.broadcast({
      type: "JOIN_REQUEST",
      roomId: cleanCode,
      senderName: "Ronin Errante",
    });

    return true;
  }

  public enableBotCompanion(playerName: string = "Ren, Ronin Guardián") {
    this.currentRoom = "BOT-SOLO";
    this.isBotEnabled = true;
    this.partnerState = {
      id: "bot-companion",
      name: playerName,
      x: 1.5,
      z: 3.5,
      rotationY: 0,
      health: 100,
      isAttacking: false,
      attackId: 0,
      status: "en_refugio",
      lastSeen: Date.now(),
    };
    this.notifyPartner();
  }

  public disconnect() {
    if (this.currentRoom) {
      this.broadcast({
        type: "LEAVE",
        roomId: this.currentRoom,
      });
    }
    this.currentRoom = null;
    this.partnerState = null;
    this.isBotEnabled = false;
    this.notifyPartner();
  }

  public updateLocalPlayer(
    x: number,
    z: number,
    angle: number,
    health: number,
    isAttacking: boolean,
    attackId: number,
  ) {
    if (!this.currentRoom) return;

    if (this.isBotEnabled && this.partnerState) {
      // Simulación de IA compañera táctica si se juega en solitario
      const dx = x - this.partnerState.x;
      const dz = z - this.partnerState.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 3.0) {
        this.partnerState.x += (dx / dist) * 0.08;
        this.partnerState.z += (dz / dist) * 0.08;
        this.partnerState.rotationY = Math.atan2(dx, dz);
        this.partnerState.status = "explorando";
      } else {
        this.partnerState.status = dist < 2.0 ? "en_refugio" : "combatiendo";
      }

      this.partnerState.isAttacking = isAttacking;
      this.partnerState.attackId = attackId;
      this.partnerState.lastSeen = Date.now();
      this.notifyPartner();
      return;
    }

    this.broadcast({
      type: "PLAYER_STATE",
      roomId: this.currentRoom,
      data: {
        x,
        z,
        rotationY: angle,
        health,
        isAttacking,
        attackId,
        status: health < 30 ? "herido" : isAttacking ? "combatiendo" : "explorando",
        lastSeen: Date.now(),
      },
    });
  }

  public sendPing(text: string, kind: CoopPing["kind"] = "danger") {
    const ping: CoopPing = {
      id: Math.random().toString(36).substring(2, 9),
      sender: "Tú",
      text,
      kind,
      timestamp: Date.now(),
    };

    this.pingListeners.forEach((fn) => fn(ping));

    if (this.currentRoom) {
      this.broadcast({
        type: "PING",
        roomId: this.currentRoom,
        ping: { ...ping, sender: "Compañero Ronin" },
      });
    }
  }

  public onPartnerChange(callback: (partner: PartnerState | null) => void) {
    this.partnerListeners.push(callback);
    callback(this.partnerState);
    return () => {
      this.partnerListeners = this.partnerListeners.filter((cb) => cb !== callback);
    };
  }

  public onPingReceived(callback: (ping: CoopPing) => void) {
    this.pingListeners.push(callback);
    return () => {
      this.pingListeners = this.pingListeners.filter((cb) => cb !== callback);
    };
  }

  private broadcast(message: Record<string, unknown>) {
    if (this.channel) {
      this.channel.postMessage(message);
    }
  }

  private handleMessage(msg: any) {
    if (!msg || !msg.type || msg.roomId !== this.currentRoom) return;

    switch (msg.type) {
      case "JOIN_REQUEST":
        this.broadcast({
          type: "JOIN_ACCEPT",
          roomId: this.currentRoom,
          hostName: "Líder Samurái",
        });
        break;

      case "JOIN_ACCEPT":
      case "PLAYER_STATE":
        this.partnerState = {
          id: "partner-player",
          name: msg.data?.name || "Compañero Ronin",
          x: msg.data?.x ?? 0,
          z: msg.data?.z ?? 0,
          rotationY: msg.data?.rotationY ?? 0,
          health: msg.data?.health ?? 100,
          isAttacking: !!msg.data?.isAttacking,
          attackId: msg.data?.attackId ?? 0,
          status: msg.data?.status ?? "explorando",
          lastSeen: Date.now(),
        };
        this.notifyPartner();
        break;

      case "PING":
        if (msg.ping) {
          this.pingListeners.forEach((fn) => fn(msg.ping));
        }
        break;

      case "LEAVE":
        this.partnerState = null;
        this.notifyPartner();
        break;
    }
  }

  private notifyPartner() {
    this.partnerListeners.forEach((fn) => fn(this.partnerState));
  }
}

export const coop = new CoopManager();
