const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // Ensure you have a Netlify Access Token (Personal Access Token)
    // You can generate one in Netlify Dashboard -> User settings -> Applications -> Personal access tokens
    // Add it as an environment variable in Netlify: NETLIFY_ACCESS_TOKEN
    const NETLIFY_ACCESS_TOKEN = process.env.NETLIFY_ACCESS_TOKEN;
    // Replace with your form ID from Netlify (Dashboard -> Forms -> Your Form Name -> Settings)
    const FORM_ID = process.env.NETLIFY_FORM_ID; 

    if (!NETLIFY_ACCESS_TOKEN || !FORM_ID) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Netlify access token or form ID not configured.' }),
        };
    }

    try {
        const response = await fetch(`https://api.netlify.com/api/v1/forms/${FORM_ID}/submissions?access_token=${NETLIFY_ACCESS_TOKEN}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error('Netlify API error:', response.status, response.statusText);
            const errorBody = await response.text();
            console.error('Netlify API error response body:', errorBody);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `Failed to fetch submissions from Netlify API: ${response.statusText}` }),
            };
        }

        const submissions = await response.json();

        // Process submissions to extract desired data and filter for public display
        const publicSignatories = [];
        let totalCount = 0;

        submissions.forEach(submission => {
            // Netlify form data is in submission.data
            const data = submission.data;
            totalCount++; // Count all submissions

            // Only add to public list if publicDisplay was checked and it's not spam
            // Netlify marks spam with a 'spam' property
            if (data.publicDisplay === 'yes' && !submission.spam) {
                publicSignatories.push({
                    name: data.name,
                    title: data.title || '',
                    organization: data.organization,
                    organizationType: data.organizationType,
                    country: data.country || '',
                    timestamp: submission.created_at, // Use Netlify's timestamp
                    verified: true // Assume all fetched are 'verified' for display
                });
            }
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                count: totalCount, // This is the total number of submissions
                signatories: publicSignatories, // This is the list for public display
            }),
        };

    } catch (error) {
        console.error('Error fetching Netlify submissions:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error while fetching signatories.' }),
        };
    }
};
