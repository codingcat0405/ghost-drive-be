import { BaseEntity } from "./BaseEntity";
import { Entity, Property } from "@mikro-orm/core";

@Entity()
export class File extends BaseEntity {
  constructor() {
    super();
  }

  @Property()
  name!: string;

  @Property()
  objectKey!: string; // this is the key of the file in the s3 bucket

  @Property({
    "default": "/"
  })
  path!: string; // this is the path of the file in frontend allow user to organize files via folders(directories)

  @Property({
    type: "bigint",
  })
  size!: number; //size in bytes can be use in future for user quotation and billing

  @Property({
    nullable: true,
  })
  mimeType!: string;

  @Property()
  userId!: number;

}