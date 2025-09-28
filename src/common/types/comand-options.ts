import { ClientSession } from "mongoose";

export interface CommonCommandOptions {
  session?: ClientSession;
}