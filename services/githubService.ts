
export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  path: string; // e.g. 'services/mockData.ts'
  branch: string;
}

export const githubService = {
  // Update or Create a file in the repository
  updateFile: async (config: GitHubConfig, content: string, commitMessage: string): Promise<void> => {
    const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`;

    try {
      // 1. Get the current file SHA (required to update existing files)
      const getResponse = await fetch(`${apiUrl}?ref=${config.branch}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      let sha: string | undefined;

      if (getResponse.ok) {
        const data = await getResponse.json();
        sha = data.sha;
      } else if (getResponse.status !== 404) {
        const err = await getResponse.json();
        throw new Error(`Erro ao buscar arquivo: ${err.message}`);
      }

      // 2. Prepare content (Convert string to Base64 safely handling UTF-8)
      // Standard btoa fails with unicode characters, so we escape first
      const base64Content = btoa(unescape(encodeURIComponent(content)));

      // 3. Send PUT request
      const body: any = {
        message: commitMessage,
        content: base64Content,
        branch: config.branch,
      };

      if (sha) {
        body.sha = sha;
      }

      const putResponse = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify(body),
      });

      if (!putResponse.ok) {
        const err = await putResponse.json();
        throw new Error(`Erro ao salvar no GitHub: ${err.message}`);
      }

    } catch (error: any) {
      console.error(error);
      throw new Error(error.message || "Falha desconhecida na comunicação com o GitHub.");
    }
  }
};
