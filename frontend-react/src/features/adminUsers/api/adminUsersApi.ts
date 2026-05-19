import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";
import type { CreateUserRequestDto, PagedUsersResponse } from "../types/adminUsers";

export async function adminListUsers(args: { skip: number; take: number; role?: string }) {
  const params: Record<string, any> = { skip: args.skip, take: args.take };
  if (args.role) params.role = args.role;

  const { data } = await axiosClient.get<PagedUsersResponse>(endpoints.adminUsers, { params });
  return data;
}

export async function adminCreateUser(dto: CreateUserRequestDto) {
  const { data } = await axiosClient.post(endpoints.adminUsers, dto);
  return data;
}

export async function adminReplaceRoles(userId: string, roles: string[]) {
  await axiosClient.put(endpoints.adminUserRoles(userId), roles);
}
