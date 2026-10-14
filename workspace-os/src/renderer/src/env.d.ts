/// <reference types="vite/client" />
import type { WorkspaceApi } from '@shared/tipler'

declare global {
  interface Window {
    workspace: WorkspaceApi
  }
}
