return {
  {
    "sindrets/diffview.nvim",
    cmd = "DiffviewOpen",
  },

  {
    "esmuellert/codediff.nvim",
    cmd = "CodeDiff",
    opts = {
      diff = {
        layout = "inline",
      },

      explorer = {
        view_mode = "tree",
        focus_on_select = true,
      },

      keymaps = {
        explorer = {
          select = "o",
        },
      },
    },
  },
}
