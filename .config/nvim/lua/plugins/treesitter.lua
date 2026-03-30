return {
  {
    "nvim-treesitter/nvim-treesitter",
    branch = "main",
    lazy = false,
    build = function()
      pcall(function()
        require("nvim-treesitter").install({
          "query",
          "vim",
          "vimdoc",
          "javascript",
          "lua",
          "tsx",
          "typescript",
          "html",
          "scss",
          "css",
          "json",
          "prisma",
          "markdown",
          "markdown_inline",
          "python",
          "go",
          "rust",
          "dot",
          "bash",
          "jsdoc",
          "yaml",
          "vue",
          "cpp",
          "c",
        })
      end)

      if vim.cmd.TSUpdate then
        pcall(vim.cmd.TSUpdate)
      end
    end,
    opts = {},
    dependencies = {
      {
        "nvim-treesitter/nvim-treesitter-textobjects",
        branch = "main",
        enabled = true,
        opts = function()
          return {
            select = {
              lookahead = true,

              -- selection_modes = {
              -- 	["@parameter.outer"] = "v", -- charwise
              -- 	["@function.outer"] = "V", -- linewise
              -- 	["@class.outer"] = "<c-v>", -- blockwise
              -- },
            },
          }
        end,
      },

      {
        "nvim-treesitter/nvim-treesitter-context",
        opts = {

          enable = false, -- Enable this plugin (Can be enabled/disabled later via commands)
          -- Avoid the sticky context from growing a lot.
          max_lines = 3,
          -- Match the context lines to the source code.
          multiline_threshold = 1,
          -- Disable it when the window is too small.
          min_window_height = 20,
        },
      },

      {
        "windwp/nvim-ts-autotag",
        opts = {
          enable = true,
          enable_close_on_slash = false,
          filetypes = {
            "htmldjango",
            "html",
            "javascript",
            "typescript",
            "javascriptreact",
            "typescriptreact",
            "svelte",
            "vue",
            "tsx",
            "jsx",
            "rescript",
            "xml",
            "php",
            "markdown",
            "glimmer",
            "handlebars",
            "hbs",
            "astro",
          },
        },
      },
      { "windwp/nvim-autopairs", opts = { disable_filetype = { "TelescopePrompt", "vim" } } },

      {
        "JoosepAlviste/nvim-ts-context-commentstring",
        opts = {
          enable = true,
          enable_autocmd = false,
        },
      },
    },
  },
}
