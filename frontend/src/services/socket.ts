import { io } from "socket.io-client";

const API_URL = import.meta.env.API_URL;

export const socket = io(API_URL);
