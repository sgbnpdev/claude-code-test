{
    'name': 'Org Chart Portal',
    'version': '17.0.1.0.0',
    'category': 'Website',
    'summary': 'Interactive 3D org chart on the website portal',
    'depends': ['website', 'portal'],
    'data': [
        'security/ir.model.access.csv',
        'views/orgchart_templates.xml',
        'views/portal_menu.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            'orgchart_portal/static/src/css/orgchart.css',
        ],
    },
    'installable': True,
    'application': False,
    'license': 'LGPL-3',
}
