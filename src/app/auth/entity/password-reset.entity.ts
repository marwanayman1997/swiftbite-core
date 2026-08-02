export class PasswordReset {
  id: number;
  userId: number;
  otpHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;

  constructor(props: {
    id: number;
    userId: number;
    otpHash: string;
    expiresAt: Date;
    consumedAt: Date | null;
    createdAt: Date;
  }) {
    this.id = props.id;
    this.userId = props.userId;
    this.otpHash = props.otpHash;
    this.expiresAt = props.expiresAt;
    this.createdAt = props.createdAt;
    this.consumedAt = props.consumedAt;
  }

  isExpired(): boolean {
    return this.expiresAt < new Date();
  }
}
