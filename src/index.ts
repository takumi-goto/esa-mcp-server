#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"
import {
  getV1TeamsTeamNamePosts,
  getV1TeamsTeamNamePostsPostNumber,
} from "./generated/esa-api/esaAPI"
import { zodToJsonSchema } from "zod-to-json-schema"
import { version } from "../package.json"
import { Post } from "./generated/esa-api/esaAPI.schemas"

const env = z
  .object({
    ESA_API_KEY: z.string(),
    DEFAULT_ESA_TEAM: z.string(),
  })
  .parse(process.env)

const server = new Server(
  {
    name: "esa-server",
    version: version,
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
)

const orderSchema = z.union([z.literal("asc"), z.literal("desc")]).default("desc")
const sortSchema = z
  .union([
    z.literal("created"),
    z.literal("updated"),
    z.literal("number"),
    z.literal("stars"),
    z.literal("comments"),
    z.literal("best_match"),
  ])
  .default("best_match")

const searchPostsSchema = z.object({
  teamName: z.string().default(env.DEFAULT_ESA_TEAM),
  query: z.string(),
  order: orderSchema,
  sort: sortSchema,
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(50),
})

const readEsaPostSchema = z.object({
  teamName: z.string().default(env.DEFAULT_ESA_TEAM),
  postNumber: z.number(),
})

const readEsaMultiplePostsSchema = z.object({
  teamName: z.string().default(env.DEFAULT_ESA_TEAM),
  postNumbers: z.array(z.number()),
})

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_esa_posts",
        description:
          "Search posts in esa.io. Response is paginated. " +
          "For efficient search, you can use customized queries like the following: " +
          "keyword for partial match, \"keyword\" for exact match, " +
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
          "updated:>YYYY-MM-DD for filtering by update date",
        inputSchema: zodToJsonSchema(searchPostsSchema),
      },
      {
        name: "read_esa_post",
        description: "Read a post in esa.io.",
        inputSchema: zodToJsonSchema(readEsaPostSchema),
      },
      {
        name: "read_esa_multiple_posts",
        description: "Read multiple posts in esa.io.",
        inputSchema: zodToJsonSchema(readEsaMultiplePostsSchema),
      },
    ],
  }
})

const fetchPosts = async (
  teamName: string,
  query: string,
  order: z.infer<typeof orderSchema>,
  sort: z.infer<typeof sortSchema>,
  page: number,
  perPage: number,
): Promise<Omit<Post, "body_html" | "body_md">[]> => {
  const response = await getV1TeamsTeamNamePosts(
    teamName,
    {
      q: query,
      order: order,
      sort: sort,
      page: page,
      per_page: perPage,
    },
    {
      headers: {
        Authorization: `Bearer ${env.ESA_API_KEY}`,
      },
    }
  )

  // esa 的には取ってきちゃうが、LLM が呼むのに全文は大きすぎるので外す
  const posts = (response.data.posts ?? []).map(
    ({ body_html, body_md, ...others }) => others
  )

  return posts
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params

    switch (name) {
      case "search_esa_posts":
        const parsed = searchPostsSchema.safeParse(args)
        if (!parsed.success) {
          throw new Error(`Invalid arguments for search_posts: ${parsed.error}`)
        }

        const posts = await fetchPosts(
          parsed.data.teamName,
          parsed.data.query,
          parsed.data.order,
          parsed.data.sort,
          parsed.data.page,
          parsed.data.perPage
        )

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                posts: posts,
                nextPage: parsed.data.page + 1,
              }),
            },
          ],
        }

      case "read_esa_post":
        const parsedRead = readEsaPostSchema.safeParse(args)
        if (!parsedRead.success) {
          throw new Error(
            `Invalid arguments for read_esa_post: ${parsedRead.error}`
          )
        }

        const response = await getV1TeamsTeamNamePostsPostNumber(
          env.DEFAULT_ESA_TEAM,
          parsedRead.data.postNumber,
          {},
          {
            headers: {
              Authorization: `Bearer ${env.ESA_API_KEY}`,
            },
          }
        )
        const { body_html, ...others } = response.data

        return {
          content: [{ type: "text", text: JSON.stringify(others) }],
        }

      case "read_esa_multiple_posts":
        const parsedReadMultiple = readEsaMultiplePostsSchema.safeParse(args)
        if (!parsedReadMultiple.success) {
          throw new Error(
            `Invalid arguments for read_esa_multiple_posts: ${parsedReadMultiple.error}`
          )
        }

        const multiplePosts = await Promise.all(
          parsedReadMultiple.data.postNumbers.map(async (postNumber) => {
            const response = await getV1TeamsTeamNamePostsPostNumber(
              env.DEFAULT_ESA_TEAM,
              postNumber,
              {},
              {
                headers: {
                  Authorization: `Bearer ${env.ESA_API_KEY}`,
                },
              }
            )
            const { body_html, ...others } = response.data

            return others
          })
        )

        return {
          content: [{ type: "text", text: JSON.stringify(multiplePosts) }],
        }
      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
