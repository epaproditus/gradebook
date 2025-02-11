<script lang="ts">
    import { onMount } from 'svelte';
    import { supabase } from '$lib/supabaseClient';
    
    let externalAssignments: any[] = [];
    let isExpanded = true;

    onMount(async () => {
        const { data, error } = await supabase
            .from('external_assignments')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (data) externalAssignments = data;
    });
</script>

<div class="external-assignments">
    <div class="header" on:click={() => isExpanded = !isExpanded}>
        <h3>External Assignments</h3>
        <span class="icon">{isExpanded ? '▼' : '▶'}</span>
    </div>
    
    {#if isExpanded}
        <div class="assignments-list">
            {#each externalAssignments as assignment}
                <div class="assignment-item">
                    <span>{assignment.title}</span>
                    <span class="source-badge">{assignment.source}</span>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .external-assignments {
        border: 1px solid #ddd;
        border-radius: 4px;
        margin: 1rem 0;
    }

    .header {
        padding: 0.5rem;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .assignments-list {
        padding: 0.5rem;
    }

    .assignment-item {
        padding: 0.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .source-badge {
        font-size: 0.8em;
        padding: 0.2rem 0.5rem;
        background: #eee;
        border-radius: 12px;
    }
</style>
