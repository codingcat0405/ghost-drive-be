import {BaseEntity} from "./BaseEntity";
import {Entity, ManyToOne, Property, type Opt} from "@mikro-orm/core";
import {User} from "./User";

@Entity()
export class File extends BaseEntity {
  constructor() {
    super();
  }

  @Property()
  filename!: string;

  @Property()
  originalName!: string;

  @Property()
  mimeType!: string;

  @Property()
  fileSize!: number;

  @Property()
  encryptedAESKey!: string; // AES key encrypted with user's PIN

  @Property()
  minioPath!: string; // Path in MinIO storage

  @ManyToOne(() => User)
  owner!: User;

  @Property()
  uploadedAt: Date & Opt = new Date();
}
