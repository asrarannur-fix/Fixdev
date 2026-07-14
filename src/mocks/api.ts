import {
  INITIAL_TENANTS,
  INITIAL_USERS,
  INITIAL_BRANCHES,
  INITIAL_PRODUCTS,
} from "./seedData";

export const mockApi = {
  getTenants: async () => INITIAL_TENANTS,
  getUsers: async () => INITIAL_USERS,
  getBranches: async () => INITIAL_BRANCHES,
  getProducts: async () => INITIAL_PRODUCTS,
};