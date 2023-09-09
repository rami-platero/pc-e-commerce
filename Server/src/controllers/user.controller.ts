import { NextFunction, Request, Response } from "express";
import { User } from "../entities/User";
import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
import {
  clearCookieLoggedIn,
  clearJWTCookie,
  createAccessToken,
  setCookieLoggedIn,
} from "../utils/jwt";
dotenv.config({ path: __dirname + "/.env" });

export const createToken = (id: number): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn: "10y" });
};

export type RefreshToken = {
  id: number;
};

export const getUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { jwt: token } = req.cookies;
    if (!token) {
      clearCookieLoggedIn(res);
      return res.sendStatus(403);
    }
    if (token) {
      jwt.verify(
        token,
        process.env.REFRESH_TOKEN_SECRET!,
        async (err: unknown, decoded: unknown) => {
          if (err) {
            // expired
            clearCookieLoggedIn(res);
            clearJWTCookie(res);
            return res.sendStatus(403);
          }

          const user = await User.findOne({
            where: { id: (decoded as RefreshToken).id },
          });
          if (user) {
            const accessToken = createAccessToken(user);
            const { password, roles, refreshToken, ...rest } = user;
            // set logged_in cookie in case someone deletes it
            setCookieLoggedIn(res);
            return res.status(200).json({ user: rest, accessToken });
          } else {
            return res.sendStatus(404);
          }
        }
      );
    }
  } catch (error) {
    return next(error);
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const user = await User.findBy({ id: parseInt(id) });
    if (!user) return res.status(404).json({ error: "User not found" });
    await User.delete({ id: parseInt(id) });
    return res.status(204).json({ message: "Removed user successfully" });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(400).json({ error });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const updatedUser = await User.createQueryBuilder()
      .update(User)
      .set(req.body)
      .where("id =:id", { id: req.params.id })
      .returning("*")
      .execute();

    return res.status(200).json({ message: "success", updatedUser });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(400).json({ error });
  }
};

export const viewProfile = async (req: Request, res: Response) => {
  try {
    const { user } = req.body;
    return res.status(200).json({ user });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(400).json({ error });
  }
};