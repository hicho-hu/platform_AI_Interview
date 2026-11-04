"""Read local bootstrap credentials and smoke-test live admin HTTP endpoints without exposing tokens."""
import json
from pathlib import Path
import httpx

root=Path('/Users/huichao/PycharmProjects/AI_Interview')
credentials=json.loads((root/'var/admin-bootstrap.json').read_text())
with httpx.Client(base_url='http://127.0.0.1:8000',timeout=15) as client:
    response=client.post('/api/v1/admin/auth/login',json={k:credentials[k] for k in ('login_name','password')})
    response.raise_for_status()
    token=response.json()['data']['access_token']
    headers={'Authorization':'Bearer '+token}
    for route in ['/auth/me','/dashboard/overview','/dashboard/trends','/users','/interviews','/quality-tasks',
                  '/finance/summary','/products','/payment-channels','/ai/costs','/admin-users','/audit-logs']:
        result=client.get('/api/v1/admin'+route,headers=headers)
        result.raise_for_status()
        assert result.json()['code']=='OK',route
        print('PASS '+route)
    assert client.get('/api/v1/admin/approvals',headers=headers).status_code==404
    assert client.post('/api/v1/admin/approvals/old/review',headers=headers,json={'approve':True,'reason':'legacy check'}).status_code==404
    assert not any('/admin/approvals' in path for path in client.get('/openapi.json').json()['paths'])
    print('PASS approval routes removed')
    response=client.post('/api/v1/admin/auth/logout',headers=headers)
    response.raise_for_status()
    assert client.get('/api/v1/admin/auth/me',headers=headers).status_code==401
    print('PASS logout revokes session')
