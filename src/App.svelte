<script lang="ts">
  import WebTorrent from 'webtorrent';
  import axios from 'axios';
  export let Trackers: string[];
  let client = new WebTorrent();
  let movies: {title: string, hashes: string}[] = [];
  let metadataStatus = { isCollectingMetadata: true, currentFile: 0, totalFiles: 0 };
  let downloadProperties = { isClientActive: false, fileName: '', fileSize: 0, progress: 0, downloadSpeed: 0 };
  let placeholder = '';
  let query = '';

  function startDownloadingTorrent(hashes: string)
  {
    let hashArray = hashes.split('+');
    let timeoutID = setTimeout(() => {
      client.remove(hashArray[0]);
      hashArray.shift();
      if (hashArray.length > 0) {
        startDownloadingTorrent(hashArray.join('+'));
        return;
      }
      alert('Sorry, but the download failed for the desired movie');
    }, 2 * 60 * 1000);
    let torrent = client.add(hashArray[0], {
      announce: ['wss://tracker.openwebtorrent.com', 'wss://tracker.btorrent.xyz'],
      maxWebConns: -1
    });
    Trackers.forEach(tracker => {
      torrent.addWebSeed(tracker);
    });
    torrent.on('infoHash', () => {
      console.log(torrent);
      downloadProperties.isClientActive = true;
      metadataStatus.isCollectingMetadata = true;
      metadataStatus.currentFile++;
      metadataStatus.totalFiles = metadataStatus.totalFiles === 0 ? hashArray.length : metadataStatus.totalFiles;
    });
    torrent.on('ready', () => {
      console.log('Ready!');
      clearTimeout(timeoutID);
      metadataStatus.isCollectingMetadata = false;
      metadataStatus.currentFile = 0;
      metadataStatus.totalFiles = 0;
      let videoFiles = torrent.files.filter(file => file.name.endsWith('.mp4') || file.name.endsWith('.mkv'));
      if (videoFiles.length === 0) {
        alert('No MP4/MKV files were found for the desired movie');
        torrent.destroy();
        return;
      }
      downloadProperties.fileSize = videoFiles[0].length / 1000000;
      downloadProperties.fileName = videoFiles[0].name;
    });
    torrent.on('error', console.log);
    torrent.on('warning', console.log);
    torrent.on('download', () => {
      downloadProperties.downloadSpeed = torrent.downloadSpeed / 1000000;
      downloadProperties.progress = torrent.progress * 100;
    });
    torrent.on('done', () => {
      torrent.files.filter(file => file.name.endsWith('.mp4') || file.name.endsWith('.mkv')).forEach(file => {
        file.getBlobURL((err, url) => {
          if (err) {
            console.log(err);
            return;
          }
          let a = document.createElement('a');
          a.download = file.name;
          a.href = url;
          document.body.appendChild(a);
          a.click();
          a.remove();
        });
      });
    });
    torrent.on('noPeers', () => {
      console.log('No peers');
    });
}

function searchTorrent()
{
    axios.get(`https://yts.mx/api/v2/list_movies.json?query_term=${query}&sort_by=seeds`)
      .then(response => {
        if (response.data.data.movie_count === 0)
        {
          placeholder = 'No results found';
          return;
        }
        placeholder = 'Select an option';
        movies = [];
        response.data.data.movies.forEach(movie => {
          let hashes = movie.torrents
            .sort(({ seedsA }: { seedsA: number }, { seedsB }: { seedsB: number}): number => { return seedsB - seedsA; })
            .map(({ hash }: { hash: string }) => hash).join('+');
          movies.push({ title: movie.title_long, hashes });
        });
      }).catch(console.log);
  }
</script>

<svelte:head>
  <title>watch-a-movie</title>
</svelte:head>

<main>
  <h1>watch-a-movie</h1>
  <div class="searchBox">
    <input type="text" bind:value={query} />
    <button on:click={searchTorrent}>Search</button>
  </div>
  <select name="movies" on:change={(event) => startDownloadingTorrent(event.currentTarget.value)}>
    <option>{placeholder}</option>
    {#each movies as movie }
      <option value={movie.hashes}>{movie.title}</option>
    {/each}
  </select>
  <div class="fileInformation" hidden={!downloadProperties.isClientActive}>
    <div hidden={!metadataStatus.isCollectingMetadata}>
      <p class="collectingMetadata">Collecting Metadata [{metadataStatus.currentFile}/{metadataStatus.totalFiles}]</p>
      <p class="metadataTimeInfo">(This can take up to {metadataStatus.totalFiles * 2} minute{metadataStatus.totalFiles > 0 ? 's' : ''})</p>
    </div>
    <p class="fileBeingDownloaded"><b>Downloading:</b> {downloadProperties.fileName}</p>
    <div class="progressBarBackground">
      <div class="progressBarForeground" style="width: {downloadProperties.progress.toFixed(2) + '%'};"/>
      <span class="progress">{downloadProperties.progress.toFixed(2)}%</span>
    </div>
    <p class="downloadStatus">Download Speed: {downloadProperties.downloadSpeed.toFixed(2)} M/S<br/>Total: {downloadProperties.fileSize.toFixed(2)} M</p>
  </div>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    width: 100%;
    align-items: center;
  }

  .searchBox {
    display: flex;
  }

  .searchBox input {
    text-align: center;
  }

  .fileInformation {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .progressBarBackground {
    background: lightgreen;
  }

  .progressBarForeground {
    background: rgb(122, 233, 122);
  }

  .downloadStatus {
    text-align: center;
    font-size: smaller;
  }
</style>
