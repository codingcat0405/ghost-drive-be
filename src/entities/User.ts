import { BaseEntity } from "./BaseEntity";
import { Entity, Property } from "@mikro-orm/core";

@Entity()
export class User extends BaseEntity {
  constructor() {
    super();
  }

  @Property()
  username!: string;

  @Property({
    nullable: true
  })
  fullName?: string;


  @Property({
    nullable: true
  })
  email?: string;

  @Property()
  password!: string;

  @Property({
    nullable: true,
  })
  avatar?: string;

  @Property({
    nullable: true,
  })
  aesKeyEncrypted?: string;

  @Property({
    nullable: true,
  })
  bucketName!: string;

  @Property({
    default: 1024 * 1024 * 1024, // 1GB
    type: "bigint",
  })
  storageQuota?: number; // in bytes


  @Property()
  role!: string;

  @Property({
    nullable: true,
  })
  twoFactorSecret?: string;

  @Property({
    default: false,
  })
  twoFactorEnabled!: boolean;

  @Property({
    nullable: true,
  })
  twoFactorLoginAttemptAt?: Date;
}