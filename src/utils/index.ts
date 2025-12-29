


export function createPageUrl(pageName: string) {
    // Split page name and query parameters
    const [name, query] = pageName.split('?');
    const baseUrl = '/' + name.toLowerCase().replace(/ /g, '-');
    // Preserve query parameters if they exist
    return query ? `${baseUrl}?${query}` : baseUrl;
}