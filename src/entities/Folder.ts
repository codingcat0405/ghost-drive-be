import { Entity, Property } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";

@Entity()
export class Folder extends BaseEntity {
  @Property()
  name!: string;

  @Property({ nullable: true })
  parentId?: number; // null for root folders

  @Property()
  userId!: number;
}