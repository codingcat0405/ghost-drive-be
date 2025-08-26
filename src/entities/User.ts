import {BaseEntity} from "./BaseEntity";
import {Entity, Property} from "@mikro-orm/core";

@Entity()
export class User extends BaseEntity {
  constructor() {
    super();
  }

  @Property()
  username!: string;

  @Property()
  password!: string;


  @Property()
  role!: string;
}