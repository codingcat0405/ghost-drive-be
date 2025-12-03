import { initORM } from "../db";
import { toPageDTO } from "../utils/pagination";

class VaultService {
  async createVault(userId: number, data: {
    title: string,
    username?: string,
    password: string,
    category: number
  }) {
    const db = await initORM();
    const vault = db.vault.create({
      title: data.title,
      username: data.username,
      password: data.password,
      category: data.category,
      userId: userId
    });
    await db.em.persistAndFlush(vault);
    return vault;
  }

  async getVaults(userId: number, params: {
    q?: string,
    category?: number,
    page?: number,
    limit?: number
  }) {
    const db = await initORM();
    const { page = 1, limit = 10 } = params;
    let offset = (page - 1) * limit;
    offset = offset < 0 ? 0 : offset;
    const whereClause: any = { userId };
    if (params.q) {
      whereClause.title = { $ilike: `%${params.q}%` };
    }
    if (params.category) {
      whereClause.category = params.category;
    }
    const res = await db.vault.findAndCount(whereClause, {
      orderBy: { createdAt: 'DESC' },
      limit,
      offset,
    });
    return toPageDTO(res, page, limit);
  }

  async updateVault(userId: number, vaultId: number, data: {
    title?: string,
    username?: string,
    password?: string,
    category?: number
  }) {
    const db = await initORM();
    const vault = await db.vault.findOne({ id: vaultId, userId });
    if (!vault) {
      throw new Error('Vault not found');
    }
    if (data.title) {
      vault.title = data.title;
    }
    if (data.username) {
      vault.username = data.username;
    }
    if (data.password) {
      vault.password = data.password;
    }
    if (data.category) {
      vault.category = data.category;
    }
    await db.em.persistAndFlush(vault);
    return vault;
  }

  async deleteVault(userId: number, vaultId: number) {
    const db = await initORM();
    const vault = await db.vault.findOne({ id: vaultId, userId });
    if (!vault) {
      throw new Error('Vault not found');
    }
    await db.em.removeAndFlush(vault);
    return true;
  }

  async vaultDetail(userId: number, vaultId: number) {
    const db = await initORM();
    const vault = await db.vault.findOne({ id: vaultId, userId });
    if (!vault) {
      throw new Error('Vault not found');
    }
    return vault;
  }
}

export default VaultService;