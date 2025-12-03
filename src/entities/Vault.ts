import { Entity, Property } from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";

@Entity()
class Vault extends BaseEntity {
  @Property()
  title!: string;

  @Property({
    nullable: true,
  })
  username?: string;

  @Property()
  password!: string;

  @Property()
  userId!: number;


  @Property({
    default: -1,
  })
  category!: number; //1: Password, 2: API Key, 3: Token, -1: Other
}

export default Vault;