async function test() {
    try {
        const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Admin',
                email: 'test' + Date.now() + '@example.com',
                password: 'password123',
                tag: 'Super Admin'
            })
        });
        const data = await response.json();
        console.log('Register Response Status:', response.status);
        console.log('Register Response:', data);
    } catch (err) {
        console.error('Fetch Error:', err.message);
    }
}

test();
