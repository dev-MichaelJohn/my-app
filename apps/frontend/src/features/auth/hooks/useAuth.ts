import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthAPI } from "../api/auth.api";
import { toQuery } from "@/lib/query.lib";
import { ONE_MINUTE, type LoginAccount, type VerifyOTP } from "@my-app/shared";

export const AUTH_QUERY_KEY = ["auth", "me"] as const;

const authAPI = new AuthAPI();

export const useMe = () => {
  return useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: () => toQuery(authAPI.getMe()),
    staleTime: 10 * ONE_MINUTE,
    retry: false,
  });
};

export const useLogin = () => {
  return useMutation({
    mutationFn: (credentials: LoginAccount) => toQuery(authAPI.login(credentials)),
  });
};

export const useVerifyOTP = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: VerifyOTP) => toQuery(authAPI.verifyOTP(payload)),
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, data.user);
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => toQuery(authAPI.logout()),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/login";
    },
  });
};
