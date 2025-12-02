"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "./auth";

export async function authenticate(data: { email: string; name: string }) {
  try {
    await signIn("credentials", {
      redirect: false,
      email: data.email,
      name: data.name,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials.";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }
}

export async function signOutUser() {
  try {
    await signOut({ redirectTo: "/", redirect: true });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials.";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }
}
