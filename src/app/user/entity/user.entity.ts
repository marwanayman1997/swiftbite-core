import type { SystemRole } from "../enums.ts";

export class User {
  id: number;
  email: string;
  phone: string;
  name: string;
  passwordHash: string;
  systemRole: SystemRole;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  constructor(props: {
    id: number;
    email: string;
    phone: string;
    name: string;
    passwordHash: string;
    systemRole: SystemRole;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }) {
    this.id = props.id;
    this.email = props.email;
    this.phone = props.phone;
    this.name = props.name;
    this.passwordHash = props.passwordHash;
    this.systemRole = props.systemRole;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt;
  }
}
