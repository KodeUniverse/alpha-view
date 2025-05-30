<h1 align='center'>AlphaView</h1>

<script>
    import data from '../../go-services/scraping//data/finviz.json';
    import {goto} from '$app/navigation';
</script>

<button onclick={() => {goto('./')}}>Go Home</button>
<table border="1" cellpadding="5" cellspacing="0">
    <thead>
        <tr>
            {#each Object.keys(data[0]) as key}
                <th>{key}</th>
            {/each}
        </tr>
    </thead>
    <tbody>
        {#each data as row}
            <tr>
                {#each Object.values(row) as value}
                    <td>{value}</td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>