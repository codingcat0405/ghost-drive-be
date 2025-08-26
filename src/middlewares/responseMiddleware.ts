import {Utils, wrap} from "@mikro-orm/core";

const responseMiddleware = ({set, response}: any) => {
  set.status = 200;
  //return response directly cause [object Object] when response refers to an object of mikro-orm entity
  return Utils.isEntity(response) ? wrap(response).toObject() : response;
}
export default responseMiddleware;