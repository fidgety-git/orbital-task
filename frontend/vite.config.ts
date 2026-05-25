import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
	},
	server: {
		port: 5173,
		host: "0.0.0.0",
		proxy: {
			"/api": {
				target: "http://backend:8000",
				changeOrigin: true,
			},
		},
	},
});
