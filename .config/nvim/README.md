## My neovim configuration



Before setup you should install

- gcc/clang
- node
- git
- Telescope deps:
    - fd-find
    - ripgrep
    - gcc/clang
    - make

## JavaScript tooling

`nvim-lspconfig` enables `oxlint` and `oxfmt` when their project configuration is present, including Vite+ configuration. ESLint remains enabled for projects with ESLint configuration.

`<leader>f` uses the attached Oxfmt LSP client. If it is not attached, it falls back to the configured Conform formatter.

To choose one toolchain for a Neovim session instead of automatic project detection:

```sh
NVIM_JAVASCRIPT_TOOLING=vp nvim
NVIM_JAVASCRIPT_TOOLING=eslint nvim
```

The equivalent Lua setting is `vim.g.javascript_tooling = "auto"`, `"vp"`, or `"eslint"`.
