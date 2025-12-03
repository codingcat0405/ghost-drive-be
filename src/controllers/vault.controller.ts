import Elysia, { t } from "elysia";
import authMacro from "../macros/auth";
import VaultService from "../services/VaultService";

const vaultService = new VaultService();
const vaultController = new Elysia()
  .group("/vaults", group =>
    group
      .use(authMacro)
      .post("/", async ({ body, user }) => {
        return await vaultService.createVault(user.id, body);
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Vault"],
          security: [{ JwtAuth: [] }],
          description: "Create a new vault"
        },
        body: t.Object({
          title: t.String(),
          username: t.Optional(t.String()),
          password: t.String(),
          category: t.Number(),
        })
      })
      .get("/", async ({ query, user }) => {
        return await vaultService.getVaults(user.id, query);
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Vault"],
          security: [{ JwtAuth: [] }],
          description: "Get vaults"
        },
        query: t.Object({
          q: t.Optional(t.String()),
          category: t.Optional(t.Number()),
          page: t.Optional(t.Number()),
          limit: t.Optional(t.Number()),
        })
      })
      .put("/:vaultId", async ({ params, body, user }) => {
        return await vaultService.updateVault(user.id, parseInt(params.vaultId), body);
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Vault"],
          security: [{ JwtAuth: [] }],
          description: "Update vault"
        },
        body: t.Object({
          title: t.Optional(t.String()),
          username: t.Optional(t.String()),
          password: t.Optional(t.String()),
          category: t.Optional(t.Number()),
        }),
        params: t.Object({
          vaultId: t.String(),
        })
      })
      .delete("/:vaultId", async ({ params, user }) => {
        return await vaultService.deleteVault(user.id, parseInt(params.vaultId));
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Vault"],
          security: [{ JwtAuth: [] }],
          description: "Delete vault"
        },
        params: t.Object({
          vaultId: t.String(),
        })
      })
      .get("/:vaultId", async ({ params, user }) => {
        return await vaultService.vaultDetail(user.id, parseInt(params.vaultId));
      }, {
        checkAuth: ['user'],
        detail: {
          tags: ["Vault"],
          security: [{ JwtAuth: [] }],
          description: "Get vault detail"
        },
        params: t.Object({
          vaultId: t.String(),
        })
      })
  );

export default vaultController;