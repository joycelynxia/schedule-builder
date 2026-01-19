import {PrismaClient} from "../generated/prisma"
// import {PrismaClient} from "@prisma/client"

import 'dotenv/config';

export const prisma = new PrismaClient();
