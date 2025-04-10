#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { version } from "../package.json"
import { getRequiredEnv } from "./env"
import { orderSchema, sortSchema } from "./schema"
import { ApiClient } from "./api"
import { stringify } from "yaml"
import { formatTool } from "./formatTool"
import { searchQueryDocument } from "./guide/search-query"

export const createServer = () => {
  const server = new McpServer({
    name: "esa-server",
    version: version,
  })

  const client = new ApiClient(getRequiredEnv("ESA_API_KEY"))

  server.tool(
    "get_search_query_document",
    "Retrieves comprehensive documentation about esa.io search queries. Provides detailed information about available query syntax, operators, and search parameters to effectively search through esa posts.",
    {},
    async () => {
      return {
        content: [
          {
            type: "text",
            text: searchQueryDocument,
          },
        ],
      }
    }
  )

  server.tool(
    "search_esa_posts",
    "Search posts in esa.io. Response is paginated. " +
      "For efficient search, you can use customized queries like the following: " +
      'keyword for partial match, "keyword" for exact match, ' +
      "keyword1 keyword2 for AND match, " +
      "keyword1 OR keyword2 for OR match, " +
      "-keyword for excluding keywords, " +
      "title:keyword for title match, " +
      "wip:true or wip:false for WIP posts, " +
      "kind:stock or kind:flow for kind match, " +
      "category:category_name for partial match with category name, " +
      "in:category_name for prefix match with category name, " +
      "on:category_name for exact match with category name, " +
      "body:keyword for body match, " +
      "tag:tag_name or tag:tag_name case_sensitive:true for tag match, " +
      "user:screen_name for post author's screen name, " +
      "updated_by:screen_name for post updater's screen name, " +
      "comment:keyword for partial match with comments, " +
      "starred:true or starred:false for starred posts, " +
      "watched:true or watched:false for watched posts, " +
      "watched_by:screen_name for screen name of members watching the post, " +
      "sharing:true or sharing:false for shared posts, " +
      "stars:>3 for posts with more than 3 stars, " +
      "watches:>3 for posts with more than 3 watches, " +
      "comments:>3 for posts with more than 3 comments, " +
      "done:>=3 for posts with 3 or more done items, " +
      "undone:>=3 for posts with 3 or more undone items, " +
      "created:>YYYY-MM-DD for filtering by creation date, " +
      "updated:>YYYY-MM-DD for filtering by update date." +
      "Strongly recommend see get_search_query_document for complete query usage.",
    {
      teamName: z.string().default(getRequiredEnv("DEFAULT_ESA_TEAM")),
      query: z.string(),
      order: orderSchema,
      sort: sortSchema,
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(100).default(50),
    },
    async (input) =>
      await formatTool(async () => {
        const posts = await client.searchPosts(
          input.teamName,
          input.query,
          input.order,
          input.sort,
          input.page,
          input.perPage
        )

        return {
          content: [
            {
              type: "text",
              text: stringify({
                posts: posts,
                nextPage: input.page + 1,
              }),
            },
          ],
        }
      })
  )

  server.tool(
    "read_esa_post",
    "Read a post in esa.io.",
    {
      teamName: z.string().default(getRequiredEnv("DEFAULT_ESA_TEAM")),
      postNumber: z.number(),
    },
    async (input) =>
      await formatTool(async () => {
        const [response] = await client.readPosts(input.teamName, [
          input.postNumber,
        ])

        if (response === undefined) {
          throw new Error("post not found")
        }

        return response
      })
  )

  server.tool(
    "read_esa_multiple_posts",
    "Read multiple posts in esa.io.",
    {
      teamName: z.string().default(getRequiredEnv("DEFAULT_ESA_TEAM")),
      postNumbers: z.array(z.number()),
    },
    async (input) =>
      await formatTool(
        async () => await client.readPosts(input.teamName, input.postNumbers)
      )
  )

  server.tool(
    "create_esa_post",
    "Create a new post in esa.io. Required parameters: name. Optional parameters: body_md, tags, category, wip (default: true), message.",
    {
      teamName: z.string().default(getRequiredEnv("DEFAULT_ESA_TEAM")),
      name: z.string(),
      body_md: z.string().optional(),
      tags: z.array(z.string()).optional(),
      category: z.string().optional(),
      wip: z.boolean().default(true),
      message: z.string().optional(),
    },
    async (input) =>
      await formatTool(async () => {
        const { teamName: createTeamName, ...postData } = input
        return client.createPost(createTeamName, postData).then((data) => ({
          success: true,
          number: data.number,
          full_name: data.full_name,
          url: data.url,
          wip: data.wip,
          created_at: data.created_at,
          message: data.message,
          kind: data.kind,
          tags: data.tags,
          category: data.category,
          revision_number: data.revision_number,
          created_by: data.created_by,
        }))
      })
  )

  server.tool(
    "update_esa_post",
    "Update an existing post in esa.io. Required parameters: postNumber. Optional parameters: name, body_md, tags, category, wip, message.",
    {
      teamName: z.string().default(getRequiredEnv("DEFAULT_ESA_TEAM")),
      postNumber: z.number(),
      name: z.string().optional(),
      body_md: z.string().optional(),
      tags: z.array(z.string()).optional(),
      category: z.string().optional(),
      wip: z.boolean().optional(),
      message: z.string().optional(),
    },
    async (input) =>
      await formatTool(async () => {
        const { teamName, postNumber, ...updateData } = input
        return client
          .updatePost(teamName, postNumber, updateData)
          .then((data) => ({
            success: true,
            number: data.number,
            full_name: data.full_name,
            url: data.url,
            wip: data.wip,
            created_at: data.created_at,
            updated_at: data.updated_at,
            message: data.message,
            kind: data.kind,
            tags: data.tags,
            category: data.category,
            revision_number: data.revision_number,
            created_by: data.created_by,
            updated_by: data.updated_by,
          }))
      })
  )

  server.tool(
    "delete_esa_post",
    "Delete a post in esa.io. Required parameters: postNumber.",
    {
      teamName: z.string().default(getRequiredEnv("DEFAULT_ESA_TEAM")),
      postNumber: z.number(),
    },
    async (input) =>
      await formatTool(async () =>
        client.deletePost(input.teamName, input.postNumber)
      )
  )

  return {
    server,
  }
}
