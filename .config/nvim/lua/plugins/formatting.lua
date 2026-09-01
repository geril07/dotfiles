local function format_file()
  local bufnr = vim.api.nvim_get_current_buf()
  local clients = vim.lsp.get_clients({ bufnr = bufnr, name = "oxfmt" })

  if #clients > 0 then
    vim.lsp.buf.format({
      async = true,
      filter = function(client)
        return client.name == "oxfmt"
      end,
    })
    return
  end

  require("conform").format({
    async = true,
    lsp_format = "fallback",
  })
end

local prettier_opts = { "prettierd", "prettier", stop_after_first = true }

local prettier_fts = {
  "javascript",
  "javascriptreact",
  "typescript",
  "typescriptreact",
  "vue",
  "css",
  "scss",
  "less",
  "html",
  "json",
  "jsonc",
  "yaml",
  "markdown",
  "markdown.mdx",
  "graphql",
  "handlebars",
  "svelte",
  "astro",
  "htmlangular",
}

return {
  {
    "stevearc/conform.nvim",
    lazy = true,
    config = function()
      local formatters_by_ft = {
        sh = { "shfmt" },
        lua = { "stylua" },
        python = { "black" },
        sql = { "sqlfmt" },
        ocaml = { "ocamlformat" },
        -- kdl = { "kdlfmt" },
      }

      for _, ft in ipairs(prettier_fts) do
        formatters_by_ft[ft] = prettier_opts
      end

      require("conform").setup({
        default_format_opts = {
          lsp_format = "fallback",
        },
        notify_on_error = true,
        notify_no_formatters = true,

        formatters_by_ft = formatters_by_ft,
      })
    end,
    keys = {
      { "<leader>f", format_file, desc = "Format file" },
      { "<A-F>", format_file, desc = "Format file" },
    },
  },
}
