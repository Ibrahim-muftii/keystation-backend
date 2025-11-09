import express from 'express';
import { sendFile } from '../controller/file.controller';

const router = express.Router();

router.get('/audio/:filename', sendFile);

export default router;