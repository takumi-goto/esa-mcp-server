import { z } from "zod"
import { orderSchema, sortSchema } from "./schema"
import { Post } from "./generated/esa-api/esaAPI.schemas"
import { getV1TeamsTeamNamePosts } from "./generated/esa-api/esaAPI"
import { getRequiredEnv } from "./env"

export const fetchPosts = async (
  teamName: string,
  query: string,
  order: z.infer<typeof orderSchema>,
  sort: z.infer<typeof sortSchema>,
  page: number,
  perPage: number
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
        Authorization: `Bearer ${getRequiredEnv("ESA_API_KEY")}`,
      },
    }
  )

  // esa 的には取ってきちゃうが、LLM が呼むのに全文は大きすぎるので外す
  const posts = (response.data.posts ?? []).map(
    ({ body_html, body_md, ...others }) => others
  )

  return posts
}
