import React, { useState } from 'react';
import { Box, Input, Button, VStack, Text, Heading, Spinner, Container, Image, HStack } from '@chakra-ui/react';
import axios from 'axios';

axios.defaults.baseURL = 'http://localhost:3000';

export default function App() {
  const [artistName, setArtistName] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [instagramData, setInstagramData] = useState(null);
  const [tiktokData, setTiktokData] = useState(null);
  const [spotifyData, setSpotifyData] = useState(null);
  const [loading, setLoading] = useState(false);

  const formatUsername = (name) => {
    return name.toLowerCase().replace(/\s+/g, '');
  };

  const fetchStats = async () => {
    setLoading(true);
    setTiktokData(null)
    setInstagramData(null)
    setSpotifyData(null)
    if (!artistName || !spotifyUrl) {
      alert('Please enter both the artist name and Spotify URL.');
      setLoading(false);
      return;
    }
    const formattedName = formatUsername(artistName);
    try {
      const [instaRes, tiktokRes, spotifyRes] = await Promise.allSettled([
        axios.get(`/scrape/basic/instagram/${formattedName}`),
        axios.get(`/scrape/basic/tiktok/${formattedName}`),
        axios.get(`/spotify/scrape?url=${encodeURIComponent(spotifyUrl)}`)
      ]);
     
     

      if (instaRes.status === 'fulfilled') {
        console.log(instaRes.value.data, "instagram data")
        setInstagramData(instaRes.value.data);
      } else {
        console.error('Instagram error:', instaRes.reason);
      }
  
      if (tiktokRes.status === 'fulfilled') {
        console.log(tiktokRes.value.data, "tiktok data")
        setTiktokData(tiktokRes.value.data);
      } else {
        console.error('TikTok error:', tiktokRes.reason);
      }

      if (spotifyRes.status === 'fulfilled') {
        const formattedTracks = spotifyRes.value.data.topTracks.map(track => ({
          trackName: track.trackName,
          streams: track.streams.toLocaleString() // Format streams with commas
        }));
        setSpotifyData({ ...spotifyRes.value.data, topTracks: formattedTracks });
      } else {
        console.error('Spotify error:', spotifyRes.reason);
      }
    } catch (error) {
      alert(`Error: ${error.response?.data?.error || 'Failed to fetch data.'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <VStack spacing={5} p={8} >
      <Heading>Artist Social Stats</Heading>
      <Container maxWidth={500}>
      <Input m={2} placeholder="Artist Name" value={artistName} onChange={(e) => setArtistName(e.target.value)}/>
      <Input m={2} placeholder="Spotify URL" value={spotifyUrl} onChange={(e) => setSpotifyUrl(e.target.value)}/>
      </Container>
      <HStack>
      <Button colorScheme="blue" onClick={fetchStats} isLoading={loading}>Get Social Stats</Button>
      </HStack>
      {loading && <Spinner />}
<HStack alignItems="start" mt={8}>
      <Container>
      {tiktokData && (
        <>
      <Image rounded="md" src={tiktokData.data.profilePic} alt="profile pic" height="400px"/>
      </>
      )}
      </Container>
      <Container>
      
      {instagramData && (
        <>
        <Heading>Basic Stats</Heading>
        <Box borderWidth="1px" p={4} m={4} borderRadius="md" w="300px" h="120px">
          <Text>📸 Instagram: @{instagramData.data.handle}</Text>
          <Text>Followers: {instagramData.data.followers}</Text>
          <Text>Posts: {instagramData.data.totalPosts}</Text>
          <Text>Engagement Rate: {instagramData.engagement.engagementRate}</Text>
        </Box>
        </>
      )}
      {tiktokData && (
        <Box borderWidth="1px" p={4} m={4} borderRadius="md" w="300px" h="120px">
          <Text>🎵 TikTok: @{tiktokData.data.handle}</Text>
          <Text>Followers: {tiktokData.data.followers}</Text>
          <Text>Likes: {tiktokData.data.totalLikes}</Text>
          <Text>Engagement Rate: {tiktokData.engagement.engagementRate}</Text>
        </Box>
      )}

</Container>

<Container>
{spotifyData && (
  <>

          <Heading>Spotify Top Tracks:</Heading>

                  {spotifyData.topTracks && Array.isArray(spotifyData.topTracks) && spotifyData.topTracks.map((track, index) => (
                    <Box key={index} p={4} m={4} borderWidth="1px" borderRadius="md" w="300px" h="120px">
                      <Text>{index + 1}. {track.trackName}</Text>
                      <Text>Streams: {track.streams}</Text>
                    </Box>
                  ))}
                  </>
      )}
      </Container>
      </HStack>
    </VStack>
  );
}