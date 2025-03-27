export interface RepoConfig {
  name: string;
  alias?: string[] | string;
  url: string;
  description: string;
  defaultPath: string;
  branches: BranchConfig[];
}

export interface BranchConfig {
  name: string;
  description: string;
}

export interface Config {
  globalDescription?: string;
  repos: RepoConfig[];
}

export interface RepoInfo {
  name: string;
  alias?: string[] | string;
  description: string;
  branches: BranchInfo[];
}

export interface BranchInfo {
  name: string;
  description: string;
}

export interface FileItem {
  name: string;
  isDirectory: boolean;
  path: string;
}
