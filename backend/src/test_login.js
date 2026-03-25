async function testLogin() {
    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'superadmin@gmail.com',
                password: 'password123' 
            })
        });
        const data = await response.json();
        console.log('Login Response Status:', response.status);
        console.log('Login Response:', data);
    } catch (err) {
        console.error('Fetch Error:', err.message);
    }
}

testLogin();
