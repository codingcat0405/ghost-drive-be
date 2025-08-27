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
  objectKey!: string;

  @Property()
  size!: number;

  @Property({
    nullable: true,
  })
  mimeType!: string;

  @Property()
  userId!: number;

}