import {PrismaClient} from "../generated/prisma"
import 'dotenv/config';

export const prisma = new PrismaClient();
