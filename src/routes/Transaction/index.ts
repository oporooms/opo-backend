import { createTransaction, getTransactionById, listTransactions } from "@/controllers/Transaction";
import { Router } from "express";

const transactionRouter = Router();

transactionRouter.get("/", listTransactions);
transactionRouter.get("/:transactionId", getTransactionById);
transactionRouter.post("/", createTransaction);

export default transactionRouter;
