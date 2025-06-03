import { Request, Response } from 'express';
import { dataModel } from '@/models/dataModel';

export const getMessage = (req: Request, res: Response) => {
  res.json({ message: dataModel.message });
};
