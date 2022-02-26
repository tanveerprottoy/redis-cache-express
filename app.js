import express, { urlencoded } from 'express'
import { createClient } from 'redis'
import fetch from 'node-fetch'

const app = express()

const client = createClient()
connectRedisClient()

const DEFAULT_EXPIRATION = 3600
/* createClient({
    url: 'redis://localhost:6380'
}); */

client.on('error', (err) => console.log('Redis Client Error', err));

app.use(
    urlencoded(
        {
            extended: true
        }
    )
)
app.get(
    '/api/v1/users/posts',
    async (req, res) => {
        // check cache
        // await connectRedisClient()
        const cachedData = await client.get('posts')
        console.log(cachedData)
        if(!cachedData) {
            const response = await fetch('https://jsonplaceholder.typicode.com/users/1/posts')
            const data = await response.json()
            await client.setEx(
                'posts',
                DEFAULT_EXPIRATION,
                JSON.stringify(data)
            )
            return res.send(data)
        }
        return res.send(
            JSON.parse(
                cachedData
            )
        )
    }
)
app.get(
    '/api/v1/posts/:id/comments',
    cacheMiddleware,
    async (req, res) => {
        console.log(req.params.id)
        const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${req.params.id}/comments`)
        const data = await response.json()
        await client.setEx(
            'comments',
            DEFAULT_EXPIRATION,
            JSON.stringify(data)
        )
        return res.send(data)
    }
)

async function cacheMiddleware(req, res, next) {
    const cachedData = await client.get('comments')
    console.log(cachedData)
    if(!cachedData) {
        return next()
    }
    return res.send(
        JSON.parse(
            cachedData
        )
    )
}

async function connectRedisClient() {
    // must connect client before use
    await client.connect()
}

app.listen(3000, () => {
    console.log('Express App Running')
})