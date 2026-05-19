import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";
import type {
  AuthResponseDto,
  LoginRequestDto,
  RegisterRequestDto,
  MeResponseDto,
  UpdateProfileRequestDto,
  ForgotPasswordRequestDto,
  ResetPasswordRequestDto,
} from "../types/auth";

export async function login(dto: LoginRequestDto) {
  const { data } = await axiosClient.post<AuthResponseDto>(endpoints.authLogin, dto);
  return data;
}

export async function register(dto: RegisterRequestDto) {
  const { data } = await axiosClient.post<AuthResponseDto>(endpoints.authRegister, dto);
  return data;
}

export async function forgotPassword(dto: ForgotPasswordRequestDto) {
  const { data } = await axiosClient.post<{ message: string }>(endpoints.authForgotPassword, dto);
  return data;
}

export async function resetPassword(dto: ResetPasswordRequestDto) {
  const { data } = await axiosClient.post<{ message: string }>(endpoints.authResetPassword, dto);
  return data;
}

export async function me() {
  const { data } = await axiosClient.get<MeResponseDto>(endpoints.authMe);
  return data;
}

export async function updateMyProfile(dto: UpdateProfileRequestDto) {
  await axiosClient.put(endpoints.authMeProfile, dto);
}